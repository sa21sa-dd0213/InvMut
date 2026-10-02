import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - burnFlashGovernanceAsset mutant detection", function () {
  it("should detect mutant where assetBurnable is replaced with false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
    await mockToken.waitForDeployment();

    const LimboDAOMock = await ethers.getContractFactory("LimboDAOMock");
    const mockDAO = await LimboDAOMock.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();

    // Configure flash governance with assetBurnable = true
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    const assetBurnable = true;

    // First call endConfiguration to set configured = true (needed for onlySuccessfulProposal)
    await arbiter.connect(owner).endConfiguration();

    // Configure flash governance (this requires successful proposal - mock DAO returns true)
    await arbiter.connect(owner).configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      assetBurnable
    );

    // Now make a flash governance decision first
    // Transfer tokens to addr1 for the flash governance
    await mockToken.transfer(addr1.address, amount);
    await mockToken.connect(addr1).approve(await arbiter.getAddress(), amount);

    // Call assertGovernanceApproved to create pending decision
    await arbiter.connect(addr1).assertGovernanceApproved(
      addr1.address,
      addr2.address,
      false
    );

    // Now try to burn the asset
    // Get initial balance of mockToken
    const initialSupply = await mockToken.totalSupply();

    // Call burnFlashGovernanceAsset - this should burn tokens if assetBurnable is true
    await arbiter.connect(owner).burnFlashGovernanceAsset(
      addr2.address,
      addr1.address,
      await mockToken.getAddress(),
      amount
    );

    // Verify the tokens were burned (total supply decreased)
    const finalSupply = await mockToken.totalSupply();

    // In the original contract, the burn should happen, decreasing supply
    // In the mutant, the burn is skipped (false instead of assetBurnable), so supply stays the same
    expect(finalSupply).to.be.lessThan(initialSupply);
  });
});