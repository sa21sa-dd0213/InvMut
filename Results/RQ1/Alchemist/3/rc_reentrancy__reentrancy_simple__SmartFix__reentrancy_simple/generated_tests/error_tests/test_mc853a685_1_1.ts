import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mc853a685 test", function () {
  it("should revert when withdrawal call fails (mutant removed revert)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a malicious contract that will revert on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy(instanceAddress);
    await malicious.waitForDeployment();
    const maliciousAddress = await malicious.getAddress();

    // Fund the malicious contract with some ETH first
    await owner.sendTransaction({
      to: maliciousAddress,
      value: ethers.parseEther("1.0")
    });

    // Add balance to the malicious contract in Reentrance
    const addTx = await malicious.connect(attacker).addBalance({ value: ethers.parseEther("0.5") });
    await addTx.wait();

    // Verify balance was added
    expect(await instance.getBalance(maliciousAddress)).to.equal(ethers.parseEther("0.5"));

    // Attempt withdrawal - should revert in original, but mutant might not revert
    // In the mutant, the revert() was removed, so the function won't revert
    // but the balance will be set to 0 incorrectly
    const withdrawTx = await malicious.connect(attacker).withdrawAndRevert();

    // The transaction should revert because the malicious contract's receive reverts
    await expect(withdrawTx).to.be.reverted;

    // After the failed withdrawal, the balance should still be 0.5 ETH
    // In the mutant, the balance would be 0 (bug), so this assertion kills the mutant
    expect(await instance.getBalance(maliciousAddress)).to.equal(ethers.parseEther("0.5"));
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
  address public reentranceContract;

  constructor(address _reentranceContract) {
    reentranceContract = _reentranceContract;
  }

  function addBalance() external payable {
    (bool success, ) = reentranceContract.call{value: msg.value}(abi.encodeWithSignature("addToBalance()"));
    require(success, "Add balance failed");
  }

  function withdrawAndRevert() external {
    (bool success, ) = reentranceContract.call(abi.encodeWithSignature("withdrawBalance()"));
    require(success, "Withdraw failed");
  }

  receive() external payable {
    revert("Intentionally reverting");
  }

  fallback() external payable {
    revert("Intentionally reverting");
  }
}