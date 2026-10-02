import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DCF mutant m73866da7 test", function () {
  it("should detect when liquidityReceiveAddress is set to zero address instead of constructor argument", async function () {
    const [owner, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with a specific liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get the helper contract address from DCF
    const helperAddress = await dcf.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);
    
    // The helper has a setLiquidityReceiveAddress function but we need to check
    // the address that was set in the constructor. We can check this indirectly
    // by calling addLiquidity and checking where liquidity goes, but a simpler
    // approach is to check the initial setup:
    // The DCF constructor sets whiteAddress[liquidityReceiveAddress] = true
    // If the mutant set it to address(0), then address(0) will be whitelisted
    // instead of the intended receiver
    
    // Check if liquidityReceiver is whitelisted (should be true in original)
    const isReceiverWhitelisted = await dcf.whiteAddress(liquidityReceiver.address);
    
    // In the original, liquidityReceiver should be whitelisted
    // In the mutant, it will NOT be whitelisted (address(0) gets whitelisted instead)
    expect(isReceiverWhitelisted).to.equal(false, 
      "Expected liquidity receiver to NOT be whitelisted because mutant sets address(0) instead");
    
    // Additionally, verify that address(0) IS whitelisted in the mutant
    const isZeroWhitelisted = await dcf.whiteAddress(ethers.ZeroAddress);
    expect(isZeroWhitelisted).to.equal(true,
      "Expected zero address to be whitelisted because mutant set liquidityReceiveAddress to zero");
  });
});