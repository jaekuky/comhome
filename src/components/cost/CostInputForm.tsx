import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CostInputFormProps {
  currentRent: number;
  transportCost: number;
  income: number;
  onCurrentRentChange: (value: number) => void;
  onTransportCostChange: (value: number) => void;
  onIncomeChange: (value: number) => void;
  /** commute_cache의 totalFare 기반 기본 교통비 (만원 단위) */
  defaultTransportCost?: number;
}

const CostInputForm = ({
  currentRent,
  transportCost,
  income,
  onCurrentRentChange,
  onTransportCostChange,
  onIncomeChange,
}: CostInputFormProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    value: number;
    type: "rent";
  }>({ open: false, value: 0, type: "rent" });

  const handleRentChange = useCallback(
    (values: number[]) => {
      const value = values[0];
      if (value <= 15 || value >= 130) {
        setConfirmDialog({ open: true, value, type: "rent" });
        return;
      }
      onCurrentRentChange(value);
    },
    [onCurrentRentChange],
  );

  const handleConfirm = useCallback(() => {
    onCurrentRentChange(confirmDialog.value);
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  }, [confirmDialog.value, onCurrentRentChange]);

  const handleIncomeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      onIncomeChange(raw === "" ? 0 : Number(raw));
    },
    [onIncomeChange],
  );

  return (
    <>
      <Card className="border-border shadow-card">
        <CardContent className="p-5 space-y-6">
          <h3 className="text-sm font-bold text-foreground">내 비용 입력</h3>

          {/* 현재 월세 슬라이더 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                현재 월세
              </Label>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {currentRent}만원
              </span>
            </div>
            <Slider
              value={[currentRent]}
              onValueChange={handleRentChange}
              min={10}
              max={150}
              step={5}
              aria-label="현재 월세 입력"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>10만원</span>
              <span>150만원</span>
            </div>
          </div>

          {/* 교통비 슬라이더 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                월 교통비
              </Label>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {transportCost}만원
              </span>
            </div>
            <Slider
              value={[transportCost]}
              onValueChange={(v) => onTransportCostChange(v[0])}
              min={0}
              max={30}
              step={1}
              aria-label="월 교통비 입력"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0만원</span>
              <span>30만원</span>
            </div>
          </div>

          {/* 소득 입력 (선택) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                월 소득 (선택)
              </Label>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                기기 내 처리, 서버 미전송
              </span>
            </div>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="입력하지 않아도 됩니다"
                value={income > 0 ? income.toLocaleString() : ""}
                onChange={handleIncomeInput}
                className="pr-10 text-sm"
                aria-label="월 소득 입력"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                만원
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 비현실적 월세 확인 다이얼로그 */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>월세 확인</DialogTitle>
            <DialogDescription>
              월세 {confirmDialog.value}만원은 일반적이지 않은 금액입니다.
              이대로 진행하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              취소
            </Button>
            <Button onClick={handleConfirm}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CostInputForm;
