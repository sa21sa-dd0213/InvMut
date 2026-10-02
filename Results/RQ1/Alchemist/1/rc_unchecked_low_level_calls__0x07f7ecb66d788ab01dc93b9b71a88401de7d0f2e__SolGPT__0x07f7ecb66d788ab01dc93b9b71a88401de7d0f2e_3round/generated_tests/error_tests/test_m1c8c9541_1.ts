import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m1c8c9541 test", function () {
  it("should revert when a contract tries to call wager (onlyRealPeople modifier check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PoCGame with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const whaleAddress = addr1.address;
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Deploy a malicious contract that will attempt to call wager
    const MaliciousFactory = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Attempt to call wager from the malicious contract - should revert due to onlyRealPeople
    await expect(
      malicious.connect(addr1).callWager(await instance.getAddress(), { value: betLimit })
    ).to.be.reverted;
  });
});

// Helper contract to simulate a contract calling wager
contract MaliciousCaller {
    function callWager(address target) external payable {
        (bool success, ) = target.call{value: msg.value}(abi.encodeWithSignature("wager()"));
        require(success, "wager failed");
    }
}