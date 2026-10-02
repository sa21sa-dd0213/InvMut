import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant m54c9d771 - exponentiation vs multiplication", function () {
  it("should revert or produce incorrect rsETH amount when asset price > 1 and amount > 1 due to exponentiation", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LRTDepositPool (constructor takes no arguments, uses _disableInitializers)
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await Factory.deploy();
    await depositPool.waitForDeployment();

    // Deploy mock contracts needed for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("Test Asset", "TST", 18);
    await mockAsset.waitForDeployment();

    const MockLRTOracle = await ethers.getContractFactory("MockLRTOracle");
    const mockOracle = await MockLRTOracle.deploy();
    await mockOracle.waitForDeployment();

    const MockLRTConfig = await ethers.getContractFactory("MockLRTConfig");
    const mockConfig = await MockLRTConfig.deploy();
    await mockConfig.waitForDeployment();

    // Setup roles and configuration
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    // Grant roles to owner
    await mockConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    await mockConfig.grantRole(MANAGER_ROLE, owner.address);

    // Configure mock contracts
    await mockConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await mockOracle.getAddress());
    await mockConfig.setRsETH(await mockAsset.getAddress()); // Use mock asset as rsETH for simplicity
    await mockConfig.addSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("10000"));

    // Initialize deposit pool
    await depositPool.connect(owner).initialize(await mockConfig.getAddress());

    // Set oracle prices: asset price = 2, rsETH price = 1
    const assetPrice = ethers.parseEther("2");
    const rsETHPrice = ethers.parseEther("1");
    await mockOracle.setAssetPrice(await mockAsset.getAddress(), assetPrice);
    await mockOracle.setRSETHPrice(rsETHPrice);

    // Fund user with tokens and approve deposit pool
    const depositAmount = ethers.parseEther("10"); // amount > 1
    await mockAsset.mint(user.address, depositAmount);
    await mockAsset.connect(user).approve(await depositPool.getAddress(), depositAmount);

    // Expected rsETH mint amount (original): (10 * 2) / 1 = 20
    const expectedOriginalMint = ethers.parseEther("20");

    // Get actual rsETH amount to mint from the contract (uses the mutated exponentiation)
    const actualMintAmount = await depositPool.getRsETHAmountToMint(
      await mockAsset.getAddress(),
      depositAmount
    );

    // The mutant computes: (10 ** 2) / 1 = 100, which is different from 20
    // So we assert that the actual value is NOT equal to the expected original value
    expect(actualMintAmount).to.not.equal(expectedOriginalMint);

    // Additionally, for exponentiation with these values, result should be 100 ether
    const expectedMutantMint = ethers.parseEther("100");
    expect(actualMintAmount).to.equal(expectedMutantMint);
  });
});