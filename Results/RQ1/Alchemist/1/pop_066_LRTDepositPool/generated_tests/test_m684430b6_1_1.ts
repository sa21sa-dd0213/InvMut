import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - getTotalAssetDeposits", function () {
  it("should detect mutant that removes getTotalAssetDeposits calculation by verifying deposit amount is reflected in total deposits", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock contracts needed for LRTDepositPool
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    const LRTOracleFactory = await ethers.getContractFactory("LRTOracle");
    const lrtOracle = await LRTOracleFactory.deploy();
    await lrtOracle.waitForDeployment();

    const RSETHFactory = await ethers.getContractFactory("RSETH");
    const rseth = await RSETHFactory.deploy();
    await rseth.waitForDeployment();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    // Setup LRTConfig
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    await lrtConfig.grantRole(MANAGER_ROLE, owner.address);
    await lrtConfig.setContract(ethers.keccak256(ethers.toUtf8Bytes("LRT_ORACLE")), await lrtOracle.getAddress());
    await lrtConfig.setRSETH(await rseth.getAddress());
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("10000"));

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Initialize the contract
    await depositPool.initialize(await lrtConfig.getAddress());

    // Setup oracle price
    await lrtOracle.setAssetPrice(await mockAsset.getAddress(), ethers.parseEther("1"));
    await lrtOracle.setRSETHPrice(ethers.parseEther("1"));

    // Mint tokens to addr1 and approve deposit pool
    const depositAmount = ethers.parseEther("100");
    await mockAsset.mint(addr1.address, depositAmount);
    await mockAsset.connect(addr1).approve(await depositPool.getAddress(), depositAmount);

    // Check initial total deposits is 0
    const initialDeposits = await depositPool.getTotalAssetDeposits(await mockAsset.getAddress());
    expect(initialDeposits).to.equal(0);

    // Perform deposit
    await depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), depositAmount);

    // Check total deposits reflects the deposited amount
    const totalDeposits = await depositPool.getTotalAssetDeposits(await mockAsset.getAddress());
    expect(totalDeposits).to.equal(depositAmount);

    // Additional verification: deposit more and check cumulative total
    const secondDepositAmount = ethers.parseEther("50");
    await mockAsset.mint(addr1.address, secondDepositAmount);
    await mockAsset.connect(addr1).approve(await depositPool.getAddress(), secondDepositAmount);
    await depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), secondDepositAmount);

    const totalAfterSecondDeposit = await depositPool.getTotalAssetDeposits(await mockAsset.getAddress());
    expect(totalAfterSecondDeposit).to.equal(depositAmount + secondDepositAmount);
  });
});