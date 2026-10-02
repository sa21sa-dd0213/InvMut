import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - withdraw balance check", function () {
  it("should revert when withdrawing more than balance (kills mutant that removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositTx = await instance.connect(addr1).deposit({ value: ethers.parseEther("1") });
    await depositTx.wait();

    // addr1 tries to withdraw 2 ether (more than balance)
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("2"))
    ).to.be.reverted;

    // Verify balance unchanged (optional but good practice)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(ethers.parseEther("1"));
  });
});