import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - kill mutant m647242dd", function () {
  it("should revert when calling airDrop from a contract that does not implement supportsToken", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract which implements supportsToken correctly
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that does NOT implement supportsToken
    const MaliciousFactory = await ethers.getContractFactory("MaliciousNoSupport");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Call airDrop from the malicious contract - original would revert because
    // supportsToken modifier calls Bank(msg.sender).supportsToken() which fails
    // Mutant removes supportsToken modifier, so it would succeed
    await expect(
      malicious.connect(owner).callAirDrop()
    ).to.be.reverted;
  });
});

// Helper contract that does NOT implement supportsToken
contract MaliciousNoSupport {
    address public target;
    
    constructor(address _target) {
        target = _target;
    }
    
    function callAirDrop() external {
        (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
        require(success, "call failed");
    }
}