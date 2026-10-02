import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m13bb4a40", function () {
  it("should revert when transferring to a frozen account", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Freeze addr2 (recipient)
    await instance.freezeAccount(addr2.address, true);

    // Transfer from owner to addr2 - should revert because recipient is frozen
    await expect(
      instance.transfer(addr2.address, 100)
    ).to.be.reverted;
  });
});