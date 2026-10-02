import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - remove onlyOwner from withdrawAll", function () {
  it("should allow non-owner to call withdrawAll and drain funds (mutant detection)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract via fallback
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });

    // Verify contract balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(depositAmount);

    // Non-owner calls withdrawAll - should succeed on mutant, revert on original
    const nonOwnerBalanceBefore = await ethers.provider.getBalance(nonOwner.address);
    
    await expect(
      instance.connect(nonOwner).withdrawAll()
    ).to.not.be.reverted;

    // Verify contract balance is zero and non-owner received funds
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(0);

    const nonOwnerBalanceAfter = await ethers.provider.getBalance(nonOwner.address);
    expect(nonOwnerBalanceAfter).to.be.gt(nonOwnerBalanceBefore);
  });
});