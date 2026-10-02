import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when burn is called successfully (mutant kills return statement)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Burn 100 tokens and expect the return value to be true
    const burnTx = await instance.burn(100);
    const receipt = await burnTx.wait();

    // The original contract returns true from burn()
    // The mutant removes the return statement, causing the transaction to fail
    // or the return value to be undefined
    expect(await instance.burn.staticCall(100)).to.equal(true);
  });
});