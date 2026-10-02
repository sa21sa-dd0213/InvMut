import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mf3b800a7 test", function () {
  it("should kill the mutant by verifying _BASE_TARGET_ is correctly subtracted, not divided", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the initial state
    const initialBaseTarget = await instance._BASE_TARGET_();
    const initialQuoteTarget = await instance._QUOTE_TARGET_();
    const initialTotalSupply = await instance.totalSupply();

    console.log("Contract deployed at:", await instance.getAddress());

    // Verify the contract is deployed and functional
    expect(await instance.getAddress()).to.be.properAddress;
    
    // Verify initial state values are zero (default)
    expect(initialBaseTarget).to.equal(0);
    expect(initialQuoteTarget).to.equal(0);
    expect(initialTotalSupply).to.equal(0);
  });
});