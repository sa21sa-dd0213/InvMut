import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m53d5979e test", function () {
  it("should detect overflow guard weakening by depositing max uint256 into an existing balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to create a non-zero balance
    const initialDeposit = ethers.parseEther("1");
    await (await instance.connect(owner).deposit({ value: initialDeposit })).wait();

    // Now attempt to deposit an amount that would cause overflow
    // Since balances[owner] = 1 ether, we need to add max uint256 - 1 ether + 1 to overflow
    const currentBalance = await ethers.provider.getBalance(await instance.getAddress());
    const maxUint256 = ethers.MaxUint256;
    const overflowAmount = maxUint256 - initialDeposit + 1n;

    // In original contract this should revert due to assertion, in mutant it would succeed
    await expect(
      instance.connect(owner).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});