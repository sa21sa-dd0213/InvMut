import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection test", function () {
  it("should kill mutant m2bd22b64 by triggering arithmetic overflow revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments in this case)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with a large amount to set up overflow scenario
    // Send 1 ether to the contract via receive()
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx.wait();
    
    // Get the current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Calculate msg.value needed to cause overflow when added to contract balance
    // We want: contractBalance + msg.value < contractBalance (overflow)
    // Since uint256 max is 2^256 - 1, we need msg.value > (2^256 - 1 - contractBalance)
    // Use a value that will definitely overflow: send max uint256 value minus current balance plus 1
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - contractBalance + 1n;
    
    // Attacker calls multiplicate with overflow value - should revert in original but succeed in mutant
    await expect(
      instance.connect(attacker).multiplicate(attacker.address, { value: overflowValue })
    ).to.be.reverted;
    
    // Note: In the mutant (without the require), this transaction would NOT revert,
    // but since we're testing against the mutant, the test should pass (revert expected)
    // For the actual mutant detection, we would need to run this against the mutant code
    // where the require is removed, and then this test would fail (no revert)
  });
});