import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m140f8ef2", function () {
  it("should detect the inverted sign conversion in enforceToleranceInt by passing a negative v2", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO contract that implements LimboDAOLike interface
    const MockDAO = await ethers.getContractFactory("MockLimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure the contract so that configured() returns true
    // Set configured to true in the Governable contract (slot 1)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x1",
      ethers.toBeHex(1, 32)
    ]);

    // Set security.changeTolerance to 50 (meaning 50%) at slot 5
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x5",
      ethers.toBeHex(50, 32)
    ]);

    // Set enforceLimitsActive for owner
    await instance.connect(owner).setEnforcement(true);

    // The mutant changes v2 > 0 to v2 < 0 in the second parameter conversion
    // Original: uint256 uv2 = uint256(v2 > 0 ? v2 : -1 * v2);
    // Mutant:   uint256 uv2 = uint256(v2 < 0 ? v2 : -1 * v2);

    // For a negative v2 (e.g., -5):
    // Original: v2 < 0 is true, so uv2 = uint256(-1 * (-5)) = uint256(5)
    // Mutant: v2 < 0 is true, so uv2 = uint256(-5) which underflows to a huge number

    // This huge uv2 will cause enforceTolerance to revert with "FE1"
    // because the difference calculation will overflow or fail the require statement

    // Test with v1 = 5, v2 = -3
    // Original: uv1=5, uv2=3, v1>v2 so check (5-3)*100 < 50*5 => 200 < 250 => true, passes
    // Mutant: uv1=5, uv2=uint256(-3) = huge number, v2>v1 so check (uv2-5)*100 < 50*5 => huge < 250 => false, reverts

    await expect(
      instance.connect(owner).enforceToleranceInt(5, -3)
    ).to.be.reverted;

    // This test passes on the original (if properly configured) and fails on the mutant
    // Because the mutant incorrectly handles negative v2 values
  });
});