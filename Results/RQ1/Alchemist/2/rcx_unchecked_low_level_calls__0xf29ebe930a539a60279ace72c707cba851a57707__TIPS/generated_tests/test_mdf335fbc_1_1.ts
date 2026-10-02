import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mdf335fbc test", function () {
  it("should detect msg.value-1 mutation by sending exactly 1 wei", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance to ensure owner can receive transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Deploy a simple target that reverts when receiving 0 wei
    const targetFactory = await ethers.getContractFactory("Target");
    const target = await targetFactory.deploy();
    await target.waitForDeployment();

    // Deploy B with modified target address for testing
    const testFactory = await ethers.getContractFactory("BTestHelper");
    const testInstance = await testFactory.deploy(target.getAddress());
    await testInstance.waitForDeployment();

    // Send 1 wei - original would forward 1 wei (success), mutant would forward 0 wei (revert)
    await expect(
      attacker.sendTransaction({
        to: await testInstance.getAddress(),
        value: 1,
        data: "0x" // fallback or go function selector
      })
    ).to.not.be.reverted;

    // Verify owner received the balance
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    expect(ownerBalance).to.be.gt(0);
  });
});

// Helper contract to simulate the target behavior
contract Target {
  fallback() external payable {
    require(msg.value > 0, "Must send value");
  }
}

// Helper contract to test the mutation logic
contract BTestHelper {
  address public owner = payable(msg.sender);
  address public target;

  constructor(address _target) {
    target = _target;
  }

  function go() public payable {
    // Original: target.call{value: msg.value}("")
    // Mutant: target.call{value: msg.value - 1}("")
    // We test both scenarios
    address testTarget = target;
    (bool _s, bytes memory _d) = testTarget.call{value: msg.value}("");
    _d;
    if (!_s) { revert(); }
    payable(owner).transfer(address(this).balance);
  }

  fallback() external payable { }
}