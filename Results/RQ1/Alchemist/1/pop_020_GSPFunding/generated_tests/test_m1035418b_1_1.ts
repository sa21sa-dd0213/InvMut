import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m1035418b test", function () {
  it("should emit SellShares event when sellShares is called, mutant removes event emission", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GSPFunding - constructor has no arguments (inherited from ReentrancyGuard)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy mock ERC20 tokens for base and quote
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Mint tokens to owner
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    await baseToken.mint(owner.address, baseAmount);
    await quoteToken.mint(owner.address, quoteAmount);
    
    // Transfer tokens to contract to provide initial liquidity
    await baseToken.transfer(instance.target, baseAmount);
    await quoteToken.transfer(instance.target, quoteAmount);
    
    // Set the tokens in the contract using the storage variables
    // We need to set _BASE_TOKEN_ and _QUOTE_TOKEN_
    // Since these are public variables, we can use the contract's setter or directly interact
    // The contract doesn't have a setter for these, so we'll need to use storage manipulation
    // For testing, we'll call buyShares which will use the tokens
    
    // First, set the I value (initial price) - required for buyShares calculation
    // The _I_ variable needs to be set. Since there's no setter, we'll need to deploy with specific state
    // or use storage manipulation. Let's use ethers to set storage directly.
    
    // Get the storage slot for _I_ 
    // Based on the contract layout, _I_ is after _K_ in GSPStorage
    // We'll set it to a reasonable value like 1 * 10^18 (1:1 ratio)
    const I_SLOT = 12; // Slot number for _I_ (counting from 0, after _K_)
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x" + I_SLOT.toString(16).padStart(64, "0"),
      ethers.toBeHex(ethers.parseEther("1"), 32)
    ]);
    
    // Also set _BASE_RESERVE_ and _QUOTE_RESERVE_ to non-zero to avoid division by zero
    // Slot for _BASE_RESERVE_ is 4, _QUOTE_RESERVE_ is 5
    const baseReserveSlot = "0x" + (4).toString(16).padStart(64, "0");
    const quoteReserveSlot = "0x" + (5).toString(16).padStart(64, "0");
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      baseReserveSlot,
      ethers.toBeHex(baseAmount, 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      quoteReserveSlot,
      ethers.toBeHex(quoteAmount, 32)
    ]);
    
    // Set _BASE_TARGET_ and _QUOTE_TARGET_ (slots 8 and 9)
    const baseTargetSlot = "0x" + (8).toString(16).padStart(64, "0");
    const quoteTargetSlot = "0x" + (9).toString(16).padStart(64, "0");
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      baseTargetSlot,
      ethers.toBeHex(baseAmount, 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      quoteTargetSlot,
      ethers.toBeHex(quoteAmount, 32)
    ]);
    
    // Set totalSupply (slot 10 for totalSupply in GSPStorage)
    const totalSupplySlot = "0x" + (10).toString(16).padStart(64, "0");
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      totalSupplySlot,
      ethers.toBeHex(ethers.parseEther("10000"), 32)
    ]);
    
    // Mint shares to owner
    // _SHARES_ mapping starts at slot 11
    // We need to calculate the storage slot for the mapping
    const sharesSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [owner.address, 11]
      )
    );
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      sharesSlot,
      ethers.toBeHex(ethers.parseEther("10000"), 32)
    ]);
    
    // Set _RState_ to 0 (ONE state)
    const rStateSlot = "0x" + (7).toString(16).padStart(64, "0");
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      rStateSlot,
      ethers.toBeHex(0, 32)
    ]);
    
    // Now transfer additional tokens to contract for selling
    const sellAmount = ethers.parseEther("100");
    await baseToken.mint(owner.address, sellAmount);
    await baseToken.transfer(instance.target, sellAmount);
    await quoteToken.mint(owner.address, sellAmount);
    await quoteToken.transfer(instance.target, sellAmount);
    
    // Call sync to update reserves
    await instance.connect(owner).sync();
    
    // Get total supply and calculate share amount to sell
    const totalSupply = await instance.totalSupply();
    const shareAmount = totalSupply / 10n; // Sell 10% of shares
    
    // Get initial balance of owner to check event args
    const initialBalance = await instance.connect(owner).balanceOf(owner.address);
    
    // Sell shares and expect SellShares event
    await expect(
      instance.connect(owner).sellShares(
        shareAmount,
        addr1.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        ethers.MaxUint256 // deadline
      )
    ).to.emit(instance, "SellShares")
     .withArgs(owner.address, addr1.address, shareAmount, initialBalance - shareAmount);
  });
});