import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractFactory } from "ethers";

describe("FlashGovernanceArbiter mutant detection", function () {
  it("should revert when assertGovernanceApproved is called without sufficient token balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    // Deploy mock LimboDAO
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure flash governance with the mock token
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    const assetBurnable = false;

    // First need to make the caller a successful proposal to use onlySuccessfulProposal modifier
    await mockDAO.setSuccessfulProposal(addr1.address, true);

    await instance.connect(addr1).configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      assetBurnable
    );

    // Now call assertGovernanceApproved with addr2 who has no tokens
    // The transferFrom will fail because addr2 has no tokens and hasn't approved
    await expect(
      instance.connect(addr2).assertGovernanceApproved(
        addr2.address,
        addr1.address,
        false
      )
    ).to.be.revertedWith("LIMBO: governance decision rejected.");
  });
});