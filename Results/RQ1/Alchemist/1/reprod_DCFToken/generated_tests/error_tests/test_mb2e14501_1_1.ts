import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test for setLiquidityReceiveAddress", function () {
  it("should kill mutant mb2e14501 by verifying liquidityReceiveAddress is set correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const initialLiquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(initialLiquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Get the helper contract address
    const helperAddress = await instance.helperAddress();
    const HelperFactory = await ethers.getContractFactory("LiquidityHelper");
    const helper = HelperFactory.attach(helperAddress);
    
    // Set the caller (cfo) to be able to call setLiquidityReceiveAddress
    await instance.setCaller(owner.address);
    
    // Set a new liquidity receive address
    const newAddress = ethers.Wallet.createRandom().address;
    await instance.setLiquidityReceiveAddress(newAddress);
    
    // Check that the whiteAddress mapping was updated for the new address
    const isWhiteListed = await instance.whiteAddress(newAddress);
    expect(isWhiteListed).to.be.true;
    
    // Verify that the original address is no longer the liquidity receive address
    // by checking the helper's behavior - we need to verify the address was set correctly
    // We can do this by checking if the original address is still white listed
    const originalStillWhiteListed = await instance.whiteAddress(initialLiquidityReceiveAddress);
    expect(originalStillWhiteListed).to.be.true; // Original should still be white listed
    
    // The mutant sets liquidityReceiveAddress = address(this) instead of _addr
    // We can verify this by checking that the new address was properly set in the helper
    // Since we can't directly read liquidityReceiveAddress from helper (it's private),
    // we can verify by attempting to call setLiquidityReceiveAddress again with a different address
    // and checking the behavior
    
    // Actually, let's check the whiteAddress mapping - in the original, the new address should be whitelisted
    // In the mutant, address(this) would be whitelisted instead of the new address
    const contractAddress = await instance.getAddress();
    const contractIsWhiteListed = await instance.whiteAddress(contractAddress);
    
    // In the original, contract should NOT be whitelisted by this call
    // In the mutant, contract would be whitelisted instead of newAddress
    expect(contractIsWhiteListed).to.be.false;
    
    // The new address should be whitelisted in the original
    expect(isWhiteListed).to.be.true;
    
    // Kill the mutant: if the mutant is active, newAddress won't be whitelisted
    // and contractAddress will be whitelisted instead
    // This test will pass on original and fail on mutant
  });
});