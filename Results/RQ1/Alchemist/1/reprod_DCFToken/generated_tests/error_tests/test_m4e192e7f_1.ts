import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m4e192e7f - liquidityReceiveAddress replaced with USDT address", function () {
  it("should detect that liquidityReceiveAddress is incorrectly set to USDT address instead of constructor parameter", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a specific liquidity receive address (e.g., addr1)
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Get the helper contract address
    const helperAddress = await instance.helperAddress();
    const HelperFactory = await ethers.getContractFactory("LiquidityHelper");
    const helperInstance = HelperFactory.attach(helperAddress);
    
    // Set the CFO (caller) to be able to call setLiquidityReceiveAddress
    await instance.setCaller(owner.address);
    
    // Try to set a new liquidity receive address
    const newLiquidityReceiveAddress = addr2.address;
    await instance.setLiquidityReceiveAddress(newLiquidityReceiveAddress);
    
    // Verify that the new address is whitelisted (should be set in whiteAddress)
    // This will revert in the mutant because the mutant incorrectly whitelisted USDT address
    // instead of the original constructor parameter, causing state inconsistency
    
    // Check that the liquidity receive address in the helper is correctly set
    // We can verify by attempting to add liquidity through the helper
    // The mutant will have the USDT address as liquidityReceiveAddress instead of addr1
    
    // Verify that the whiteAddress mapping has the correct entries
    const isAddr1WhiteListed = await instance.whiteAddress(addr1.address);
    const isNewAddrWhiteListed = await instance.whiteAddress(newLiquidityReceiveAddress);
    const isUsdtWhiteListed = await instance.whiteAddress("0x55d398326f99059fF775485246999027B3197955");
    
    // In the original contract: addr1 should be whitelisted (constructor param)
    // In the mutant: USDT address should be whitelisted instead of addr1
    expect(isAddr1WhiteListed).to.equal(true, "Original constructor param should be whitelisted");
    expect(isNewAddrWhiteListed).to.equal(true, "Newly set address should be whitelisted");
    
    // The mutant incorrectly sets USDT address as whitelisted instead of the constructor parameter
    // This will cause issues when trying to transfer from the liquidity receive address
    // We can verify by checking the balance of the liquidity receive address in the helper
    
    // Attempt to withdraw tokens from helper (this will fail in mutant if state is inconsistent)
    // First transfer some tokens to the helper to have balance
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    
    // In the original, liquidityReceiveAddress in helper should be addr1
    // In the mutant, it will be USDT address
    // We can verify by checking the setLiquidityReceiveAddress behavior
    // The test should pass on original but fail on mutant because the mutant
    // incorrectly sets the USDT address as the initial liquidity receive address
  });
});