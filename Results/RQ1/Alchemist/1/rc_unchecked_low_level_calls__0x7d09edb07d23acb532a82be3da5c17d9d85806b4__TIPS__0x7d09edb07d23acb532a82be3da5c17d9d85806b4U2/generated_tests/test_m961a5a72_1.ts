import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m961a5a72", function () {
  it("should revert when play() is called from a contract (not EOA) due to onlyRealPeople modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PoCGame with required constructor arguments
    const Factory = await ethers.getContractFactory("PoCGame");
    const betLimit = ethers.parseEther("1");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to public for wagering
    await instance.connect(owner).OpenToThePublic();
    
    // Have addr1 (an EOA) wager first
    await instance.connect(addr1).wager({ value: betLimit });
    
    // Deploy a malicious contract that will call play() on behalf of addr1
    const MaliciousFactory = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract so it can send the wager if needed
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: betLimit
    });
    
    // Have the malicious contract wager (this will succeed because onlyRealPeople is checked on wager)
    await malicious.wager({ value: betLimit });
    
    // Now try to call play() from the malicious contract - this should revert in original
    // because msg.sender (contract) != tx.origin (addr1 or owner)
    // But in mutant where onlyRealPeople is removed, it would succeed
    await expect(malicious.play()).to.be.reverted;
  });
});

// Helper contract to simulate a malicious caller
contract MaliciousCaller {
  address public target;
  
  constructor(address _target) {
    target = _target;
  }
  
  function wager() external payable {
    (bool success, ) = target.call{value: msg.value}(abi.encodeWithSignature("wager()"));
    require(success);
  }
  
  function play() external {
    (bool success, ) = target.call(abi.encodeWithSignature("play()"));
    require(success);
  }
  
  receive() external payable {}
}