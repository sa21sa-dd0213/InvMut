import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - m25e3728a", function () {
  it("should revert when external call fails in withdrawAll, but mutant incorrectly sets credit to zero", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious receiver contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH to deposit into DAO
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Malicious contract deposits into DAO
    await malicious.connect(owner).depositToDAO(await dao.getAddress(), { value: ethers.parseEther("1.0") });
    
    // Check initial credit
    const maliciousAddress = await malicious.getAddress();
    let credit = await dao.credit(maliciousAddress);
    expect(credit).to.equal(ethers.parseEther("1.0"));
    
    // Attempt withdrawAll - in original this would revert, in mutant it should succeed but zero credit
    // We use the malicious contract to call withdrawAll
    const tx = await malicious.connect(owner).attackWithdraw(await dao.getAddress());
    
    // In the mutant, the transaction succeeds but credit is incorrectly set to 0
    // In the original, this would revert
    await expect(tx).to.not.be.reverted;
    
    // Check that credit was incorrectly set to 0 despite failed transfer
    credit = await dao.credit(maliciousAddress);
    expect(credit).to.equal(0);
    
    // Verify the balance was reduced in DAO (mutant behavior)
    const daoBalance = await ethers.provider.getBalance(await dao.getAddress());
    expect(daoBalance).to.equal(0);
  });
});

// Helper contract that reverts on receive and can interact with DAO
contract MaliciousReceiver {
    receive() external payable {
        revert("I reject ETH");
    }
    
    function depositToDAO(address daoAddress) external payable {
        (bool success, ) = daoAddress.call{value: msg.value}(
            abi.encodeWithSignature("deposit()")
        );
        require(success);
    }
    
    function attackWithdraw(address daoAddress) external {
        (bool success, ) = daoAddress.call(
            abi.encodeWithSignature("withdrawAll()")
        );
        require(success);
    }
}