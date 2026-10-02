import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mbaf2e5c6", function () {
  it("should kill mutant by verifying balance increases after getTokens() call", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of investor
    const initialBalance = await instance.balanceOf(investor.address);
    
    // Send ether to trigger getTokens() which calls distr()
    await investor.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Get balance after distribution
    const finalBalance = await instance.balanceOf(investor.address);
    
    // In the original contract, balance should increase
    // In the mutant, balance would decrease or cause underflow
    expect(finalBalance).to.be.gt(initialBalance);
  });
});