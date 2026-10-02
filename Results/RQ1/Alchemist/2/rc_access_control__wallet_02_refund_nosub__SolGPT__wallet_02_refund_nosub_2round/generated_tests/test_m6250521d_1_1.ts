import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m6250521d - kill test", function () {
  it("should revert when withdrawing more than balance (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    await instance.connect(addr1).deposit({ value: ethers.parseEther("1") });

    // addr1 tries to withdraw 2 ether (more than balance)
    // Original contract reverts due to require check, mutant would allow it
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("2"))
    ).to.be.reverted;

    // Verify balance remains unchanged
    expect(await ethers.provider.getBalance(instance.getAddress())).to.equal(
      ethers.parseEther("1")
    );
  });
});