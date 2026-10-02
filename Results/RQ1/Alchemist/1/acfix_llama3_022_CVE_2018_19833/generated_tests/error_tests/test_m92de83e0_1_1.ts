import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls freezeAccount (detect mutant m92de83e0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to freeze addr2 from non-owner addr1 - should revert in original contract
    await expect(
      instance.connect(addr1).freezeAccount(addr2.address, true)
    ).to.be.reverted;

    // Verify that the account was NOT actually frozen (only if the revert didn't stop the state change)
    const isFrozen = await instance.frozenAccount(addr2.address);
    expect(isFrozen).to.equal(false);
  });
});