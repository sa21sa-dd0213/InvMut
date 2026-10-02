import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m4b7bd53a - kill test", function () {
  it("should revert when shares equals exactly 2001 in buyShares (original behavior) and mutant should pass", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the GSPFunding contract (no constructor arguments needed as per the contract code)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get token addresses - we need to deploy mock tokens or use existing ones
    // For this test, we'll deploy simple ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Setup the GSPFunding with tokens and initial parameters
    // We need to call the initialization function if it exists, or set parameters directly
    // For this test, we'll directly set the state variables needed for the edge case
    
    // First, we need to make the contract have the tokens
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));
    
    // Set the token addresses in the contract (if there's a setter, otherwise we need to use the storage)
    // Since the contract doesn't have a setter for tokens, we'll need to use storage manipulation
    // or deploy with proper constructor. For testing the mutant, we can directly set storage slots
    
    // Get the storage slots for _BASE_TOKEN_ and _QUOTE_TOKEN_
    // These are stored at specific slots in the contract
    const baseTokenSlot = ethers.hexlify(ethers.toBeArray(2)); // Slot 2 for _BASE_TOKEN_
    const quoteTokenSlot = ethers.hexlify(ethers.toBeArray(3)); // Slot 3 for _QUOTE_TOKEN_
    
    // Set the token addresses using storage
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseTokenSlot,
      ethers.zeroPadValue(await baseToken.getAddress(), 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteTokenSlot,
      ethers.zeroPadValue(await quoteToken.getAddress(), 32)
    ]);
    
    // Now we need to create a scenario where shares = 2001
    // This requires careful calculation of baseInput and quoteInput
    
    // First, we need to set initial reserves and totalSupply to 0 (first mint scenario)
    // The first mint calculates shares based on baseBalance and quoteBalance
    
    // We need baseBalance to be such that when totalSupply is 0, shares = 2001
    // shares = min(quoteBalance / _I_, baseBalance) when totalSupply == 0
    // Let's set _I_ = 1 (10^18 in decimal math)
    
    // Set _I_ to 1 * 10^18
    const iSlot = ethers.hexlify(ethers.toBeArray(27)); // Slot 27 for _I_
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      iSlot,
      ethers.zeroPadValue(ethers.parseEther("1"), 32)
    ]);
    
    // Set baseBalance and quoteBalance to make shares = 2001
    // If _I_ = 1, then shares = min(quoteBalance, baseBalance)
    // We need min to be 2001
    // Let's set baseBalance = 2001 and quoteBalance = 3000
    // Then shares = min(3000, 2001) = 2001
    
    // Set _BASE_RESERVE_ to 0 initially (slot 4)
    const baseReserveSlot = ethers.hexlify(ethers.toBeArray(4));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseReserveSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);
    
    // Set _QUOTE_RESERVE_ to 0 (slot 5)
    const quoteReserveSlot = ethers.hexlify(ethers.toBeArray(5));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteReserveSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);
    
    // Set _BASE_TARGET_ to 0 (slot 8)
    const baseTargetSlot = ethers.hexlify(ethers.toBeArray(8));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseTargetSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);
    
    // Set _QUOTE_TARGET_ to 0 (slot 9)
    const quoteTargetSlot = ethers.hexlify(ethers.toBeArray(9));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteTargetSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);
    
    // Set totalSupply to 0 (slot 12)
    const totalSupplySlot = ethers.hexlify(ethers.toBeArray(12));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      totalSupplySlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);
    
    // Now transfer exactly 2001 base tokens and 3000 quote tokens to the contract
    await baseToken.transfer(await instance.getAddress(), 2001);
    await quoteToken.transfer(await instance.getAddress(), 3000);
    
    // The mutant version should pass with shares = 2001 (because >=)
    // The original should revert with shares = 2001 (because >)
    
    // Test that buyShares reverts (original behavior) - this test will kill the mutant
    // because the mutant would NOT revert here
    await expect(
      instance.connect(user).buyShares(user.address)
    ).to.be.revertedWith("MINT_AMOUNT_NOT_ENOUGH");
    
    // If we reach here, the original contract reverted (as expected)
    // The mutant would have passed this test, thus being "killed"
  });
});