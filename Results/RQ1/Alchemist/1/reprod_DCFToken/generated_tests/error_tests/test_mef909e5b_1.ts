import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mef909e5b test", function () {
  it("should kill the mutant by verifying liquidityReceiveAddress is set correctly from constructor parameter", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy DCF with a specific liquidity receive address
    const customAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Some address we can track
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(customAddress);
    await instance.waitForDeployment();
    
    // Get the helper contract address
    const helperAddress = await instance.helperAddress();
    const LiquidityHelperFactory = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelperFactory.attach(helperAddress);
    
    // Check if the whiteAddress mapping in DCF has the custom address set to true
    // (since constructor sets whiteAddress[_liquidityReceiveAddress] = true)
    const isWhiteListed = await instance.whiteAddress(customAddress);
    
    // On the original, customAddress should be whitelisted
    // On the mutant, the hardcoded DCT address (0x56f46bD073E9978Eb6984C0c3e5c661407c3A447) would be whitelisted instead
    expect(isWhiteListed).to.equal(true);
    
    // Also verify that the hardcoded DCT address is NOT whitelisted (which would be the case in the mutant)
    const dctAddress = "0x56f46bD073E9978Eb6984C0c3e5c661407c3A447";
    const isDctWhiteListed = await instance.whiteAddress(dctAddress);
    expect(isDctWhiteListed).to.equal(false);
  });
});