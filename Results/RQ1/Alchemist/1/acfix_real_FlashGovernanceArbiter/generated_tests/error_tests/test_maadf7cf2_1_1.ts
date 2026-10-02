import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant maadf7cf2 test", function () {
  it("should kill mutant by calling assertGovernanceApproved with emergency=false when lastFlashGovernanceAct is zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock DAO that returns the flash governor address
    const MockDaoFactory = await ethers.getContractFactory("LimboDAOLike");
    const mockDao = await MockDaoFactory.deploy();
    await mockDao.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDao.getAddress());
    await instance.waitForDeployment();

    // Set up governance - we need to make addr1 a governed address
    // First, configure DAO to return our instance as flash governor
    // For simplicity, we directly set the governor on the DAO mock
    await mockDao.setFlashGoverner(await instance.getAddress());

    // Configure flash governance with a valid asset (ERC20 token)
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Configure flash governance parameters
    await instance.configureFlashGovernance(
      await token.getAddress(),
      ethers.parseEther("10"),
      3600, // 1 hour unlock time
      false
    );

    // Configure security parameters
    await instance.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      50  // changeTolerance
    );

    // Approve token transfer for the test
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call assertGovernanceApproved with emergency=false
    // lastFlashGovernanceAct is still 0 (default)
    // Original: block.timestamp - 0 > epochSize -> true (will pass if emergency=false)
    // Mutant: block.timestamp / 0 -> DIVISION BY ZERO REVERT
    await expect(
      instance.connect(addr1).assertGovernanceApproved(
        addr1.address,
        await instance.getAddress(),
        false
      )
    ).to.be.reverted;
  });
});