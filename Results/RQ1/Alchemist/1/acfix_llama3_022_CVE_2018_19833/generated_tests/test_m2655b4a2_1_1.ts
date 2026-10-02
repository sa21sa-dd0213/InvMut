import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring from a frozen account (kills mutant that removes frozen check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Freeze addr1's account
    await instance.freezeAccount(addr1.address, true);

    // Transfer some tokens to addr1 first so they have a balance
    await instance.transfer(addr1.address, 100);

    // Attempt to transfer from frozen addr1 account - should revert in original contract
    // but succeed in mutant where the frozen check is removed
    await expect(
      instance.connect(addr1).transfer(owner.address, 50)
    ).to.be.reverted;
  });
});