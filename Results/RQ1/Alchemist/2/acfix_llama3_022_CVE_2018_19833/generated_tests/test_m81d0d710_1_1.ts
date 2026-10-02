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
    
    // Call burn and verify it doesn't revert
    await expect(instance.burn(burnAmount)).to.not.be.reverted;
    
    // Verify the function returns true using staticCall
    const burnTx = await instance.burn.staticCall(burnAmount);
    expect(burnTx).to.equal(true);
  });
});