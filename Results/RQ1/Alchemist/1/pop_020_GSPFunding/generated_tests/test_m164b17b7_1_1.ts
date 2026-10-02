import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m164b17b7 - buyShares with existing liquidity", function () {
  it("should kill the mutant by proving that buyShares with existing reserves mints zero shares when it should mint positive shares", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Deploy mock ERC20 tokens for base and quote
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const baseTokenAddress = await baseToken.getAddress();

    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Initialize the contract by setting the tokens
    // We need to set _BASE_TOKEN_ and _QUOTE_TOKEN_ - they are public but not settable directly
    // The contract doesn't have an explicit init function, but we can check what's available
    
    // First, let's check what functions are available on the contract
    // We need to find a way to set the token addresses
    
    // Mint tokens to owner
    await baseToken.mint(owner.address, ethers.parseEther("10000"));
    await quoteToken.mint(owner.address, ethers.parseEther("10000"));

    // Transfer tokens to the contract to create initial balance
    await baseToken.transfer(contractAddress, ethers.parseEther("1000"));
    await quoteToken.transfer(contractAddress, ethers.parseEther("1000"));

    // Transfer tokens to user1
    await baseToken.transfer(user1.address, ethers.parseEther("100"));
    await quoteToken.transfer(user1.address, ethers.parseEther("100"));

    // Transfer tokens to user2
    await baseToken.transfer(user2.address, ethers.parseEther("10"));
    await quoteToken.transfer(user2.address, ethers.parseEther("10"));

    // Since we cannot set the token addresses directly, we need to use the contract's internal
    // mechanism. The contract checks balance differences to determine inputs.
    // However, without setting _BASE_TOKEN_ and _QUOTE_TOKEN_, the buyShares function won't work.
    
    // Let's check if there's a way to set these - they are public variables
    // We might need to use hardhat's storage manipulation or deploy with specific constructor
    
    // For the test to work, we'll assume the contract has been properly initialized
    // with the token addresses. In a real scenario, the deployer would need to set these.
    
    // User1 calls buyShares to create initial liquidity
    // First approve the contract to spend tokens
    await baseToken.connect(user1).approve(contractAddress, ethers.parseEther("100"));
    await quoteToken.connect(user1).approve(contractAddress, ethers.parseEther("100"));

    // Transfer base and quote to contract first (since buyShares calculates from balance difference)
    await baseToken.connect(user1).transfer(contractAddress, ethers.parseEther("50"));
    await quoteToken.connect(user1).transfer(contractAddress, ethers.parseEther("50"));

    // Call buyShares - this should initialize the pool
    // This will likely revert because _BASE_TOKEN_ and _QUOTE_TOKEN_ are not set
    // We need to handle this properly
    
    // For the purpose of this test, let's assume the contract has been properly initialized
    // and the tokens are set. We'll use a workaround.
    
    // Actually, let's check if the contract has any setter for the tokens
    // Looking at the contract, there's no public setter. But the tokens are public variables.
    // We can use hardhat's storage manipulation to set them.
    
    // Get storage slots for token addresses (they are stored in specific slots)
    // This is a hacky approach but might work for testing
    
    // Set _BASE_TOKEN_ storage slot (slot 4 in GSPStorage)
    const baseTokenStorageSlot = ethers.keccak256(
      ethers.toUtf8Bytes("GSPStorage._BASE_TOKEN_")
    );
    
    // Actually, let's try a different approach - deploy a wrapper that sets these
    
    // For now, let's skip this and focus on the logic test
    // The mutant kills the else if branch, so we need to test that branch
    
    // Since we can't easily set the storage, let's modify our approach:
    // We'll deploy the contract and directly set storage using hardhat
    
    // Set the token addresses in storage
    // The storage layout for GSPStorage (inherited by GSPFunding):
    // Slot 0: _GSP_INITIALIZED_ (bool, 1 byte)
    // Slot 1: _IS_OPEN_TWAP_ (bool, 1 byte)
    // Slot 2: _MAINTAINER_ (address, 20 bytes)
    // Slot 3: _BASE_TOKEN_ (address, 20 bytes)
    // Slot 4: _QUOTE_TOKEN_ (address, 20 bytes)
    
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x3", // slot for _BASE_TOKEN_
      ethers.zeroPadValue(baseTokenAddress, 32)
    ]);
    
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x4", // slot for _QUOTE_TOKEN_
      ethers.zeroPadValue(quoteTokenAddress, 32)
    ]);
    
    // Also set _MAINTAINER_ to owner
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x2", // slot for _MAINTAINER_
      ethers.zeroPadValue(owner.address, 32)
    ]);
    
    // Set _I_ (initial price) - slot for _I_ is after other uint256 variables
    // _I_ is at slot 17 (after _MT_FEE_RATE_, _LP_FEE_RATE_, _K_)
    // Actually let's count: 
    // 0: _GSP_INITIALIZED_ (bool)
    // 1: _IS_OPEN_TWAP_ (bool)
    // 2: _MAINTAINER_ (address)
    // 3: _BASE_TOKEN_ (address)
    // 4: _QUOTE_TOKEN_ (address)
    // 5: _BASE_RESERVE_ (uint112)
    // 6: _QUOTE_RESERVE_ (uint112) + _BLOCK_TIMESTAMP_LAST_ (uint32)
    // 7: _BASE_PRICE_CUMULATIVE_LAST_ (uint256)
    // 8: _BASE_TARGET_ (uint112)
    // 9: _QUOTE_TARGET_ (uint112) + _RState_ (uint32)
    // 10: symbol (string)
    // 11: decimals (uint8)
    // 12: name (string)
    // 13: totalSupply (uint256)
    // 14: _SHARES_ (mapping)
    // 15: _ALLOWED_ (mapping)
    // 16: DOMAIN_SEPARATOR (bytes32)
    // 17: nonces (mapping)
    // 18: _MT_FEE_RATE_ (uint256)
    // 19: _LP_FEE_RATE_ (uint256)
    // 20: _K_ (uint256)
    // 21: _I_ (uint256)
    
    // Set _I_ to 1e18 (price ratio 1:1)
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x15", // slot 21 for _I_
      ethers.zeroPadValue(ethers.parseEther("1"), 32)
    ]);
    
    // Set _K_ to 0 (no spread)
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x14", // slot 20 for _K_
      ethers.zeroPadValue("0x00", 32)
    ]);
    
    // Now try buyShares again with user1
    await baseToken.connect(user1).transfer(contractAddress, ethers.parseEther("50"));
    await quoteToken.connect(user1).transfer(contractAddress, ethers.parseEther("50"));
    
    await instance.connect(user1).buyShares(user1.address);
    
    // Now the pool should have totalSupply > 0, baseReserve > 0, quoteReserve > 0
    const totalSupplyAfterInit = await instance.totalSupply();
    expect(totalSupplyAfterInit).to.be.gt(0);
    
    // User2 transfers tokens to contract to increase balance
    await baseToken.connect(user2).transfer(contractAddress, ethers.parseEther("5"));
    await quoteToken.connect(user2).transfer(contractAddress, ethers.parseEther("5"));
    
    // Get user2's share balance before
    const sharesBefore = await instance.balanceOf(user2.address);
    
    // User2 calls buyShares
    await instance.connect(user2).buyShares(user2.address);
    
    // Get user2's share balance after
    const sharesAfter = await instance.balanceOf(user2.address);
    
    // In the original contract, user2 should receive positive shares
    // In the mutant, the else if (false) branch is never entered, so shares remains 0
    // and the function mints 0 shares (or reverts due to MINT_AMOUNT_NOT_ENOUGH check)
    // The mutant should fail this test because it either:
    // 1. Mints 0 shares (if no revert) - but sharesAfter should be > sharesBefore
    // 2. Reverts because shares is 0 and _mint requires > 1000
    
    // The key assertion: user2 should have received shares
    expect(sharesAfter).to.be.gt(sharesBefore);
  });
});