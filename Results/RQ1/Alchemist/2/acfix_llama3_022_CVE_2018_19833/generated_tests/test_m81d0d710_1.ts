import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m81d0d710 test", function () {
  it("should return true when burn is called successfully by owner", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    const burnAmount = 100;
    const result = await instance.burn(burnAmount);
    
    expect(result).to.not.be.reverted;
    const receipt = await result.wait();
    
    // Check that the function returned true by examining the transaction
    const burnTx = await instance.burn.staticCall(burnAmount);
    expect(burnTx).to.equal(true);
  });
});