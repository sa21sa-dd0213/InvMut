import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - whenNotPaused modifier removed", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let mockAsset: any;
  let mockLrtConfig: any;
  let mockOracle: any;
  let mockRsETH: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock RSETH token
    const RsETHFactory = await ethers.getContractFactory("ERC20Mock");
    mockRsETH = await RsETHFactory.deploy("rsETH", "rsETH", 18);
    await mockRsETH.waitForDeployment();

    // Deploy mock asset token
    const AssetFactory = await ethers.getContractFactory("ERC20Mock");
    mockAsset = await AssetFactory.deploy("Asset", "AST", 18);
    await mockAsset.waitForDeployment();

    // Deploy mock oracle
    const OracleFactory = await ethers.getContractFactory("LRTOracleMock");
    mockOracle = await OracleFactory.deploy();
    await mockOracle.waitForDeployment();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfigMock");
    mockLrtConfig = await LRTConfigFactory.deploy(
      await mockRsETH.getAddress(),
      await mockOracle.getAddress()
    );
    await mockLrtConfig.waitForDeployment();

    // Add asset as supported
    await mockLrtConfig.addSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize
    await instance.initialize(await mockLrtConfig.getAddress());

    // Give owner the MANAGER role
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await mockLrtConfig.grantRole(MANAGER_ROLE, owner.address);

    // Give addr1 some tokens and approve
    await mockAsset.mint(addr1.address, ethers.parseEther("100"));
    await mockAsset.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
  });

  it("should revert when depositing while contract is paused (detects missing whenNotPaused modifier)", async function () {
    // Pause the contract
    await instance.pause();

    // Verify contract is paused
    expect(await instance.paused()).to.be.true;

    // Attempt deposit - should revert with Pausable: paused if whenNotPaused is present
    // Without the modifier (mutant), this will succeed and mint rsETH
    await expect(
      instance.connect(addr1).depositAsset(await mockAsset.getAddress(), ethers.parseEther("10"))
    ).to.be.revertedWith("Pausable: paused");
  });
});