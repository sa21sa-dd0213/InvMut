import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m507102b2: non-owner can call withdrawAll when onlyOwner modifier is removed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount,
    });

    // Check contract has balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(fundAmount);

    // Non-owner (addr1) attempts to call withdrawAll
    // On original contract this would revert due to onlyOwner modifier
    // On mutant (removed modifier) it should succeed
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.not.be.reverted;

    // Verify the contract balance is drained (mutant behavior)
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(0);

    // Verify addr1 received the funds
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.be.gt(addr1BalanceBefore);
  });
});