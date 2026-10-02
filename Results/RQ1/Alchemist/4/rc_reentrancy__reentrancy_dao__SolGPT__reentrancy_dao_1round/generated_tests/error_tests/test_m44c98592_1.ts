import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44c98592 - kill by reverting fallback", function () {
  it("should revert when withdrawAll is called from a contract that rejects ether", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Deploy a malicious contract that reverts on receive/fallback
    const MaliciousFactory = await ethers.getContractFactory("MaliciousRejecter");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the malicious contract with some ETH
    await owner.sendTransaction({
      to: malicious.target,
      value: ethers.parseEther("1.0")
    });

    // Attacker (malicious contract) deposits ETH into DAO
    const depositTx = await malicious.connect(attacker).depositIntoDAO(dao.target, { value: ethers.parseEther("0.5") });
    await depositTx.wait();

    // Now attempt to withdraw - should revert because malicious contract rejects ether
    await expect(
      malicious.connect(attacker).attack(dao.target)
    ).to.be.reverted;

    // Verify state is unchanged (mutant would have changed it, so this assertion would fail on mutant)
    const balance = await ethers.provider.getBalance(dao.target);
    expect(balance).to.equal(ethers.parseEther("0.5"));
  });
});

// Helper contract that reverts on receive and exposes attack function
// This must be deployed as a separate contract
contract MaliciousRejecter {
  function depositIntoDAO(address dao) external payable {
    (bool success, ) = dao.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
    require(success);
  }

  function attack(address dao) external {
    (bool success, ) = dao.call(abi.encodeWithSignature("withdrawAll()"));
    // Do not require success - we want to test the revert
  }

  receive() external payable {
    revert("I reject ether");
  }

  fallback() external payable {
    revert("I reject ether");
  }
}