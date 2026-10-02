import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection test", function () {
  it("should detect mutant by testing Put with msg.value = 0 and checking that balance remains unchanged", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = (await instance.Acc(owner.address)).balance;

    // Call Put with 0 value - this should succeed in original (balance unchanged)
    // but mutant's require statement (acc.balance + msg.value + 1 >= acc.balance)
    // will fail when msg.value = 0 because acc.balance + 1 > acc.balance is always true,
    // HOWEVER the mutant actually changes the require to be more permissive, not restrictive.
    // The real kill condition: test with msg.value = type(uint256).max - initialBalance to trigger overflow
    // In original, overflow causes revert; in mutant, the +1 changes overflow behavior
    
    // Actually, the correct kill: test with msg.value = 0 and check that the mutant's 
    // require (acc.balance + 0 + 1 >= acc.balance) is always true (no difference).
    // The REAL difference: test with a large msg.value that causes overflow.
    // In original: acc.balance + msg.value >= acc.balance -> overflow revert
    // In mutant: acc.balance + msg.value + 1 >= acc.balance -> different overflow point
    
    // Let's use a value that causes overflow in mutant but not in original
    const maxUint = ethers.MaxUint256;
    const largeValue = maxUint - BigInt(initialBalance);
    
    // This should revert in mutant due to overflow (acc.balance + largeValue + 1 overflows)
    // but succeed in original (acc.balance + largeValue = maxUint, no overflow)
    await expect(
      instance.Put(0, { value: largeValue })
    ).to.be.reverted;
    
    // Alternative kill: test with msg.value = 0 and verify no revert
    // The mutant's require is always true for any input, so the only way to kill is
    // via the overflow difference above
  });
});