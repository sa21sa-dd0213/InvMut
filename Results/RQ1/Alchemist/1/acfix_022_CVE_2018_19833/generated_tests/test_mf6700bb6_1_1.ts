import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert when a frozen account tries to transfer tokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Freeze addr1's account
    await instance.connect(owner).freezeAccount(addr1.address, true);

    // Owner transfers some tokens to addr1 first so addr1 has a balance to transfer
    await instance.connect(owner).transfer(addr1.address, 100);

    // Attempt to transfer from frozen account - should revert
    await expect(
      instance.connect(addr1).transfer(owner.address, 50)
    ).to.be.reverted;
  });
});