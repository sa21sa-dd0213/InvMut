import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert transfer when sender is frozen", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = ethers.parseEther("100");
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so they have a balance to transfer
    const transferAmount = ethers.parseEther("10");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Freeze addr1's account
    await instance.connect(owner).freezeAccount(addr1.address, true);

    // Attempt to transfer from the frozen account - should revert
    await expect(
      instance.connect(addr1).transfer(addr2.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});