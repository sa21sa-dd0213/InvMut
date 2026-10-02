import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m13bb4a40", function () {
  it("should revert when transferring to a frozen account (mutant removed frozenAccount[_to] check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // First, transfer some tokens to addr1 so they have a balance to send
    const transferAmount = 100;
    await instance.transfer(addr1.address, transferAmount);

    // Freeze addr2 (the recipient) - onlyOwner can do this
    await instance.freezeAccount(addr2.address, true);

    // Now attempt to transfer from addr1 to frozen addr2
    // The original contract should revert; the mutant would allow it
    await expect(
      instance.connect(addr1).transfer(addr2.address, 50)
    ).to.be.reverted;
  });
});