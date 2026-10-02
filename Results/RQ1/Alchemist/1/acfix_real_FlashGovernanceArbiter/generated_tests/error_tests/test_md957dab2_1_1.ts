import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - enforceTolerance mutant kill test", function () {
  it("should kill mutant md957dab2 by calling enforceTolerance from address with enforceLimitsActive=false and expecting no revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple mock contract that implements Configurable interface
    const MockConfigurable = await ethers.getContractFactory(
      "contracts/mocks/MockConfigurable.sol:MockConfigurable"
    );
    const mockConfigurable = await MockConfigurable.deploy(false); // configured = false
    await mockConfigurable.waitForDeployment();

    // Deploy FlashGovernanceArbiter with a DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();

    // Ensure enforceLimitsActive[addr1] is false (default)
    // Call enforceTolerance with values that would fail tolerance check in mutant
    // Original: returns early because enforceLimitsActive[msg.sender] is false
    // Mutant: proceeds to check and reverts with "FE1"
    await expect(
      instance.connect(addr1).enforceTolerance(100, 0)
    ).to.not.be.reverted;

    // Also verify that the function does NOT revert even with extreme values
    await expect(
      instance.connect(addr1).enforceTolerance(1000, 1)
    ).to.not.be.reverted;
  });
});