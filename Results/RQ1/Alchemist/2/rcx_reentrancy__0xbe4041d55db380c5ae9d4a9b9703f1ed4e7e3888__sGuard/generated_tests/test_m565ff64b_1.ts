import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m565ff64b test", function () {
  it("should kill the mutant by detecting removed nonReentrant_ modifier from Initialized", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: deploy a Log contract and set it, set MinSum
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    await instance.SetLogFile(await log.getAddress());
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.Initialized();

    // Now put some ether so addr1 has balance
    await instance.connect(addr1).Put(100, { value: ethers.parseEther("2") });

    // Create a reentrant scenario: call Collect with a callback to Initialized
    // First, deploy a malicious contract that will re-enter via fallback
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrant");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract
    await malicious.connect(owner).fund({ value: ethers.parseEther("2") });

    // Call Put via malicious contract to set its balance
    await malicious.connect(owner).doPut(100);

    // Now trigger the reentrant attack: call Collect with amount that will trigger fallback
    // The malicious contract's fallback will try to call Initialized
    await expect(
      malicious.connect(owner).attack(ethers.parseEther("1"))
    ).to.be.reverted;

    // The above should revert on the original (due to nonReentrant_ guard)
    // On the mutant it would succeed because modifier is missing, thus killing the mutant
  });
});

// Helper contract for reentrancy test
// Note: This would be deployed separately; for Hardhat test we need to compile it
// The actual test should include this contract as a separate file or inline
contract MaliciousReentrant {
    MONEY_BOX target;
    constructor(address _target) { target = MONEY_BOX(_target); }
    function fund() external payable {}
    function doPut(uint _lockTime) external { target.Put(_lockTime); }
    function attack(uint _am) external {
        target.Collect(_am);
    }
    fallback() external payable {
        // Re-enter by calling Initialized
        target.Initialized();
    }
}