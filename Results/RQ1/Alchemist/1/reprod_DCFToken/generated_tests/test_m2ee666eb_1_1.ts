import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF - Kill mutant m2ee666eb (liquidityReceiveAddress set to address(this) instead of parameter)", function () {
  it("should set liquidityReceiveAddress to the constructor argument, not to address(this)", async function () {
    const [owner, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy the contract with a specific liquidityReceiveAddress
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();

    // Deploy the LiquidityHelper separately to inspect its state
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    
    // Get the helper address from the DCF contract
    const helperAddress = await dcf.helperAddress();
    const helper = await ethers.getContractAt("LiquidityHelper", helperAddress);

    // Set the caller (cfo) to owner for testing
    await dcf.setCaller(owner.address);

    // First, approve USDT and DCF tokens for the router
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    
    // Get the DCF token address
    const dcfAddress = await dcf.getAddress();

    // Simulate having USDT tokens (this would need USDT in real test environment)
    // For the purpose of testing the mutant, we verify the liquidityReceiveAddress state
    
    // The key assertion: liquidityReceiveAddress should be the external address, not the contract itself
    // We can check this by examining the LiquidityHelper contract's state
    
    // If the mutant is present, liquidityReceiveAddress will be the DCF contract address
    // If original, it will be the liquidityReceiver address
    
    // We can verify by checking who would receive LP tokens when addLiquidity is called
    // The easiest way: check the stored liquidityReceiveAddress in the helper
    
    // Since we cannot directly read private state, we test through the setter/getter pattern
    // The mutant changes the initial setting, so we verify that the DCF contract stores the correct value
    
    // Actually, we can verify by checking that the LiquidityHelper was constructed with the correct address
    // Let's check the token address stored in the helper (which is the DCF contract)
    const helperToken = await helper.token();
    expect(helperToken).to.equal(dcfAddress, "Helper should have DCF token address");
    
    // To directly test the mutant, we check that the liquidityReceiveAddress in the helper
    // is NOT the DCF contract itself (which would be the mutant behavior)
    // We can do this by setting a new liquidityReceiveAddress and checking the event
    
    // The simplest test: verify that the original liquidityReceiveAddress is the external address
    // by calling setLiquidityReceiveAddress with a new address - if the original was wrong,
    // this operation might behave differently
    
    // Let's check by calling the DCF's setLiquidityReceiveAddress and verifying it works
    const addr2 = ethers.Wallet.createRandom().address;
    await expect(
      dcf.connect(owner).setLiquidityReceiveAddress(addr2)
    ).to.not.be.reverted;
    
    // The real test: check that the liquidityReceiveAddress in the helper matches what we set
    // We can check this indirectly by verifying the whiteAddress mapping was updated
    // (since setLiquidityReceiveAddress also sets whiteAddress to true)
    
    // For a more direct test, we check the initial state:
    // If mutant, the liquidityReceiveAddress in the helper is address(this) = DCF contract
    // If original, it's the external address passed in constructor
    
    // We can test by calling addLiquidity (which uses liquidityReceiveAddress)
    // and checking who receives LP tokens - but this requires complex setup
    
    // Simpler approach: check that the DCF contract is NOT the liquidityReceiveAddress
    // by examining the effects of setLiquidityReceiveAddress
    
    // After calling setLiquidityReceiveAddress with a new address,
    // the whiteAddress for that new address should be true
    const isWhiteAfter = await dcf.whiteAddress(addr2);
    expect(isWhiteAfter).to.be.true;
    
    // The key test: verify that the original liquidityReceiveAddress (passed to constructor)
    // was correctly stored. We can check by seeing if the original address was whitelisted
    const isOriginalWhite = await dcf.whiteAddress(liquidityReceiver.address);
    expect(isOriginalWhite).to.be.true;
    
    // If the mutant is present, the liquidityReceiver would NOT be whitelisted
    // because the constructor would have whitelisted address(this) instead
  });
});