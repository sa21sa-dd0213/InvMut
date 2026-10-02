import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant kill test - overflow check removal in Put", function () {
  it("should revert on overflow in Put, but mutant allows it (kills mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract to enable Put (optional but follows flow)
    await instance.connect(owner).Initialized();

    // Get the maximum uint256 value
    const MAX_UINT = ethers.MaxUint256;

    // First, deposit a small amount to have a base balance
    const smallDeposit = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: smallDeposit });

    // Now attempt to send an amount that would cause overflow: send MAX_UINT - current balance + 1
    const currentBalance = await instance.Acc(addr1.address).then(acc => acc.balance);
    const overflowAmount = MAX_UINT - currentBalance + 1n;

    // On the original contract this should revert due to overflow check
    // On the mutant it will succeed (killing the mutant)
    await expect(
      instance.connect(addr1).Put(0, { value: overflowAmount })
    ).to.be.reverted;

    // Verify balance is unchanged (still the small deposit)
    const finalBalance = await instance.Acc(addr1.address).then(acc => acc.balance);
    expect(finalBalance).to.equal(smallDeposit);
  });
});