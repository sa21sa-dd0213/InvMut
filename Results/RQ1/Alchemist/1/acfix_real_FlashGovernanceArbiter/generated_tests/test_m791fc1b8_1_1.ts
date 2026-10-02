import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m791fc1b8 - enforceTolerance exponentiation bug", function () {
  it("should revert when enforceTolerance is called with v1 > v2 and the difference is within tolerance due to exponentiation producing huge value", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a minimal DAO mock
    const DAOMockFactory = await ethers.getContractFactory("LimboDAOLike");
    const daoMock = await DAOMockFactory.deploy();
    await daoMock.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await daoMock.getAddress());
    await instance.waitForDeployment();

    // Create a contract that implements Configurable and calls enforceTolerance
    const CallerFactory = await ethers.getContractFactory(
      `contract TestCaller {
        FlashGovernanceArbiter arbiter;
        constructor(address _arbiter) { arbiter = FlashGovernanceArbiter(_arbiter); }
        function testEnforceTolerance(uint256 v1, uint256 v2) external view {
          arbiter.enforceTolerance(v1, v2);
        }
        function configured() external pure returns (bool) { return true; }
      }
      interface FlashGovernanceArbiter {
        function enforceTolerance(uint256 v1, uint256 v2) external view;
        function setEnforcement(bool enforce) external;
      }`
    );
    const caller = await CallerFactory.deploy(await instance.getAddress());
    await caller.waitForDeployment();

    // Set enforcement for the caller contract
    const callerSigner = await ethers.getSigner(await caller.getAddress());
    await instance.connect(callerSigner).setEnforcement(true);

    // Set security.changeTolerance to 45 via storage manipulation
    // The security struct is at storage slot 2
    // changeTolerance is the 4th element (index 3), at offset 96 bytes
    const slot = "0x2";
    // Current storage value for slot 2 is 0x0...0 (all zeros)
    // We need to set changeTolerance = 45 (0x2d) at bytes 96-127
    const storageValue = "0x" + "00".repeat(12) + "2d" + "00".repeat(19);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      storageValue
    ]);

    // Now call enforceTolerance from the caller contract with v1=5, v2=3
    // Original formula: (v1-v2)*100 = 200 < 45*5 = 225? Yes, passes
    // Mutant formula: (v1-v2)**100 = 2**100 = huge number < 225? No, reverts
    await expect(caller.testEnforceTolerance(5, 3)).to.not.be.reverted;
  });
});