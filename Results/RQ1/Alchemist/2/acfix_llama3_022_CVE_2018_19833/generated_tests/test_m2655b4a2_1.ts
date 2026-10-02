import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m2655b4a2", function () {
  it("should revert when frozen account tries to transfer (kills mutant that removes frozen check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner freezes addr1's account
    await instance.freezeAccount(addr1.address, true);

    // Owner transfers some tokens to addr1 first so addr1 has balance to transfer
    await instance.transfer(addr1.address, 100);

    // Attempt to transfer from frozen addr1 account - should revert
    await expect(
      instance.connect(addr1).transfer(owner.address, 50)
    ).to.be.reverted;
  });
});