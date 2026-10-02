import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant detection", function () {
  it("should revert when withdraw fails due to recipient contract rejecting ether", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the target contract
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious receiver contract that rejects ether
    const Rejector = await ethers.getContractFactory("RejectEther");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Fund the target contract via fallback from attacker
    await attacker.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("1.0")
    });

    // Check balance is recorded
    expect(await instance.balances(attacker.address)).to.equal(ethers.parseEther("1.0"));

    // Attempt withdraw to the rejector contract (will fail)
    await expect(
      instance.connect(attacker).withdraw()
    ).to.be.reverted;

    // Verify balance remains unchanged (mutant would have zeroed it)
    expect(await instance.balances(attacker.address)).to.equal(ethers.parseEther("1.0"));
  });
});

// Helper contract that reverts on receive
contract RejectEther {
  receive() external payable {
    revert("Ether rejected");
  }
}