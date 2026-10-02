import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding - kill mutant mefdf7667", function () {
  it("should verify that _QUOTE_TARGET_ decreases after selling shares, not increases", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract with required constructor arguments
    // GSPFunding inherits from GSPVault -> GSPStorage -> ReentrancyGuard
    // The constructor of GSPStorage is the one from ReentrancyGuard (no arguments)
    // But we need to check if GSPFunding has constructor arguments - it inherits from GSPVault which inherits from GSPStorage
    // GSPStorage has no explicit constructor, so we deploy without arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // We need to set up the pool with base and quote tokens
    // Deploy mock ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Initialize the pool with tokens
    // We need to set _BASE_TOKEN_ and _QUOTE_TOKEN_ - this might require calling an init function
    // Let's check if there's an initialization function in the contract
    
    // First, let's fund the pool with tokens to be able to buy shares
    // We'll transfer tokens to the contract and then call buyShares
    
    // Mint tokens to owner
    await baseToken.mint(owner.address, ethers.parseEther("10000"));
    await quoteToken.mint(owner.address, ethers.parseEther("10000"));
    
    // Approve the contract to spend tokens
    await baseToken.approve(contractAddress, ethers.parseEther("10000"));
    await quoteToken.approve(contractAddress, ethers.parseEther("10000"));
    
    // Transfer tokens to the contract to create initial reserves
    await baseToken.transfer(contractAddress, ethers.parseEther("1000"));
    await quoteToken.transfer(contractAddress, ethers.parseEther("1000"));

    // Set the token addresses in the contract (assuming there's a setter or we can call init)
    // For this test, we need to set _BASE_TOKEN_ and _QUOTE_TOKEN_ 
    // Since we can't easily set storage variables directly, let's check if there's an initialize function
    
    // Let's check the contract bytecode for an init function or constructor that takes tokens
    
    // Alternative approach: we need to interact with the contract's actual interface
    // The contract inherits from GSPVault which inherits from GSPStorage
    // We need to set the token addresses - this might be done through a setup function
    
    // For now, let's try to set the storage directly or find the proper initialization
    // Since this is a test and we need to verify the mutation, let's use a simpler approach
    
    // Actually, looking at the contract structure, GSPFunding doesn't have an explicit init function
    // We need to set the storage variables through the constructor or deployment
    
    // Let's try to deploy with constructor arguments if they exist
    // Check if the contract constructor expects token addresses
    
    // For the purpose of this test, we'll assume we can set the tokens via some method
    // Let's check if there's a way to set them through the contract interface
    
    // Since we can't easily set storage variables, let's use a different approach
    // We'll create a test that verifies the logic by directly calling sellShares
    
    // First, let's buy some shares to have something to sell
    // We need to have base and quote tokens in the contract
    
    // Let's check the balance of the contract
    const baseBalance = await baseToken.balanceOf(contractAddress);
    const quoteBalance = await quoteToken.balanceOf(contractAddress);
    
    console.log("Base balance:", ethers.formatEther(baseBalance));
    console.log("Quote balance:", ethers.formatEther(quoteBalance));
    
    // We need to set the _BASE_TOKEN_ and _QUOTE_TOKEN_ storage variables
    // Since we can't do this directly, let's check if there's an external method
    
    // The contract has getPMMStateForCall which reads _I_ and _K_
    // But we need to set them first
    
    // Let's try to set the storage variables using hardhat's storage manipulation
    // Or we can check if there's an initialize function we missed
    
    // For this test, we'll focus on the mathematical property:
    // After sellShares, _QUOTE_TARGET_ should decrease
    
    // We need to first have shares to sell
    // Let's set up the initial state by calling the contract functions
    
    // First, set the token addresses (assuming there's a way)
    // Let's check the contract's ABI for any setter functions
    
    // Since we can't easily initialize the contract, let's create a test
    // that directly tests the mathematical property using the contract's view functions
    
    // Get the initial quote target
    // The contract has getPMMStateForCall which returns B0, Q0, etc.
    // Q0 is _QUOTE_TARGET_
    
    // For this test to work, we need the contract to be properly initialized
    // Let's check if we can call buyShares first to initialize the pool
    
    // We need to transfer tokens to the contract and then call buyShares
    // But buyShares requires _BASE_TOKEN_ and _QUOTE_TOKEN_ to be set
    
    // Let's check the contract storage slots
    // _BASE_TOKEN_ is likely at storage slot 2 (after _GSP_INITIALIZED_ and _IS_OPEN_TWAP_)
    
    // We'll use ethers to set the storage directly for testing purposes
    // This is a workaround for the lack of proper initialization
    
    // Set _BASE_TOKEN_ at slot 2
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x2",
      ethers.zeroPadValue(baseTokenAddress, 32)
    ]);
    
    // Set _QUOTE_TOKEN_ at slot 3
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x3",
      ethers.zeroPadValue(quoteTokenAddress, 32)
    ]);
    
    // Set initial reserves and targets
    // _BASE_RESERVE_ at slot 4
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x4",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1000")), 32)
    ]);
    
    // _QUOTE_RESERVE_ at slot 5
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x5",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1000")), 32)
    ]);
    
    // _BASE_TARGET_ at slot 8
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x8",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1000")), 32)
    ]);
    
    // _QUOTE_TARGET_ at slot 9
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x9",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1000")), 32)
    ]);
    
    // Set _RState_ at slot 10 (0 for ONE)
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0xa",
      ethers.zeroPadValue(ethers.toBeHex(0), 32)
    ]);
    
    // Set totalSupply at slot 14
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0xe",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("10000")), 32)
    ]);
    
    // Set _SHARES_ for addr1 (mapping at slot 12)
    // We need to compute the storage slot for the mapping
    // slot = keccak256(abi.encode(key, mappingSlot))
    const sharesSlot = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [addr1.address, 12]
    );
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      sharesSlot,
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1000")), 32)
    ]);
    
    // Set _I_ at slot 17
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x11",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1")), 32)
    ]);
    
    // Set _K_ at slot 16
    await ethers.provider.send("hardhat_setStorageAt", [
      contractAddress,
      "0x10",
      ethers.zeroPadValue(ethers.toBeHex(0), 32)
    ]);
    
    // Now get the initial quote target
    const pmmState = await instance.getPMMStateForCall();
    const initialQuoteTarget = pmmState.Q0;
    
    console.log("Initial quote target:", ethers.formatEther(initialQuoteTarget));
    
    // Call sellShares from addr1
    const shareAmount = ethers.parseEther("100");
    const baseMinAmount = 0;
    const quoteMinAmount = 0;
    const data = "0x";
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // Get the balance before selling
    const quoteTargetBefore = await instance.getPMMStateForCall().then(s => s.Q0);
    
    // Call sellShares
    await instance.connect(addr1).sellShares(
      shareAmount,
      addr2.address,
      baseMinAmount,
      quoteMinAmount,
      data,
      deadline
    );
    
    // Get the quote target after selling
    const quoteTargetAfter = await instance.getPMMStateForCall().then(s => s.Q0);
    
    console.log("Quote target before:", ethers.formatEther(quoteTargetBefore));
    console.log("Quote target after:", ethers.formatEther(quoteTargetAfter));
    
    // In the original contract, _QUOTE_TARGET_ should decrease after selling shares
    // In the mutant, _QUOTE_TARGET_ would increase
    // Therefore, checking that it decreased will kill the mutant
    expect(quoteTargetAfter).to.be.lessThan(quoteTargetBefore);
  });
});