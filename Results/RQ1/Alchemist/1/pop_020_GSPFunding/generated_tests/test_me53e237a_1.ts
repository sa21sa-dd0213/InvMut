import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding mutant kill test - me53e237a", function () {
  it("should use minimum of input ratios for minting shares when buying shares with unequal inputs", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy the contract - note: GSPFunding has no constructor arguments as it's not a constructor
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Need to initialize the contract with base and quote tokens
    // Deploy mock ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Mint tokens to user1 and owner
    const mintAmount = ethers.parseEther("10000");
    await baseToken.mint(owner.address, mintAmount);
    await quoteToken.mint(owner.address, mintAmount);
    
    // Initialize the pool - need to set tokens, targets, reserves etc.
    // This requires calling the internal initialization or setting state variables
    // Since we can't directly set private variables, we need to work with what's exposed
    
    // For testing purposes, we need to have a pool with some initial liquidity
    // Let's first set the tokens
    // Note: We need to cast the contract to access the storage variables
    const GSPStorage = await ethers.getContractFactory("GSPStorage");
    const storageInstance = await GSPStorage.attach(await instance.getAddress());
    
    // We'll need to use the actual contract's functions to set up state
    // First, let's check if there's a way to initialize
    
    // Alternative approach: Directly interact with the buyShares function
    // First, we need to transfer tokens to the contract to simulate deposits
    
    // Transfer tokens to user1
    await baseToken.transfer(user1.address, mintAmount);
    await quoteToken.transfer(user1.address, mintAmount);
    
    // Approve the contract to spend tokens
    await baseToken.connect(user1).approve(await instance.getAddress(), mintAmount);
    await quoteToken.connect(user1).approve(await instance.getAddress(), mintAmount);
    
    // Transfer tokens to the contract to simulate initial deposits
    // This creates the initial reserves
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("2000");
    
    await baseToken.transfer(await instance.getAddress(), initialBase);
    await quoteToken.transfer(await instance.getAddress(), initialQuote);
    
    // Set initial reserves by directly calling internal functions if possible
    // Since we can't, we need to use the public interface
    
    // For this test, we'll directly set the storage variables using ethers
    // This is a workaround for testing purposes
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + "0000000000000000000000000000000000000000000000000000000000000007", // _BASE_RESERVE_ slot
      ethers.zeroPadValue(ethers.toBeHex(initialBase), 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + "0000000000000000000000000000000000000000000000000000000000000008", // _QUOTE_RESERVE_ slot
      ethers.zeroPadValue(ethers.toBeHex(initialQuote), 32)
    ]);
    
    // Set totalSupply to non-zero to avoid the initial mint path
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + "000000000000000000000000000000000000000000000000000000000000000d", // totalSupply slot
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("100")), 32)
    ]);
    
    // Set base and quote targets
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + "0000000000000000000000000000000000000000000000000000000000000009", // _BASE_TARGET_ slot
      ethers.zeroPadValue(ethers.toBeHex(initialBase), 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + "000000000000000000000000000000000000000000000000000000000000000a", // _QUOTE_TARGET_ slot
      ethers.zeroPadValue(ethers.toBeHex(initialQuote), 32)
    ]);
    
    // Now simulate user1 buying shares with unequal inputs
    // Transfer more base than quote to create unequal ratios
    const additionalBase = ethers.parseEther("500");
    const additionalQuote = ethers.parseEther("100");
    
    await baseToken.connect(user1).transfer(await instance.getAddress(), additionalBase);
    await quoteToken.connect(user1).transfer(await instance.getAddress(), additionalQuote);
    
    // Call buyShares
    const tx = await instance.connect(user1).buyShares(user1.address);
    const receipt = await tx.wait();
    
    // Get the shares minted
    const user1Shares = await instance.balanceOf(user1.address);
    
    // Calculate expected shares using minimum ratio (original behavior)
    // baseInputRatio = additionalBase / initialBase = 500/1000 = 0.5
    // quoteInputRatio = additionalQuote / initialQuote = 100/2000 = 0.05
    // mintRatio = min(0.5, 0.05) = 0.05
    // expectedShares = totalSupply * mintRatio = 100 * 0.05 = 5
    
    const expectedShares = ethers.parseEther("5");
    
    // Verify that shares minted equals the minimum ratio calculation
    // The mutant would produce more shares (using max ratio = 0.5, giving 50 shares)
    expect(user1Shares).to.equal(expectedShares);
  });
});