import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant md34adec7", function () {
  it("should allow DAO address to call assertGovernanceApproved even when not in governed mapping", async function () {
    const [owner, daoAddress, user, target] = await ethers.getSigners();

    // Deploy a minimal mock for LimboDAOLike that returns the daoAddress as flash governor
    const LimboDAOMock = await ethers.getContractFactory("LimboDAOMock");
    const limboDAO = await LimboDAOMock.deploy(daoAddress.address);
    await limboDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(await limboDAO.getAddress());
    await instance.waitForDeployment();

    // Deploy a mock ERC20 token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Fund the daoAddress with tokens and approve the arbiter
    await token.transfer(daoAddress.address, ethers.parseEther("1000"));
    await token.connect(daoAddress).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Configure flash governance parameters via the DAO (which is a successful proposal)
    await instance.connect(daoAddress).configureFlashGovernance(
      await token.getAddress(),
      ethers.parseEther("10"),
      3600,
      false
    );

    // The test: DAO address (which is NOT in governed mapping) should be able to call
    // assertGovernanceApproved in the ORIGINAL code (||) but will fail in the mutant (&&)
    // because governed[daoAddress] is false
    
    // In the mutant, this will revert with "LIMBO: EP" because governed[daoAddress] is false
    // In the original, it will proceed (and likely fail on transferFrom since we haven't set allowance properly from daoAddress)
    
    // The key insight: the test should expect the call to NOT revert with "LIMBO: EP"
    // If it does revert with that message, the mutant is detected
    await expect(
      instance.connect(daoAddress).assertGovernanceApproved(
        daoAddress.address,
        target.address,
        false
      )
    ).to.not.be.revertedWith("LIMBO: EP");
  });
});