import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - reentrancy guard removal in Put", function () {
  it("should detect mutant by allowing reentrant Put call that should revert with nonReentrant modifier", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const maliciousInstance = await MaliciousFactory.deploy(await bankInstance.getAddress());
    await maliciousInstance.waitForDeployment();
    
    // Fund the malicious contract with some ether
    await owner.sendTransaction({
      to: await maliciousInstance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Attempt reentrancy attack - the malicious contract's fallback will call Put again
    // With nonReentrant modifier, this should revert
    // Without it (mutant), the second Put will succeed
    await expect(
      maliciousInstance.connect(attacker).attack(ethers.parseEther("5"), 1000000)
    ).to.be.reverted;
  });
});

// Malicious contract for reentrancy testing
contract MaliciousReentrancy {
    address public bank;
    
    constructor(address _bank) {
        bank = _bank;
    }
    
    function attack(uint256 amount, uint256 unlockTime) external payable {
        // First call to Put will trigger the fallback which calls Put again
        (bool success, ) = bank.call{value: amount}(abi.encodeWithSignature("Put(uint256)", unlockTime));
        require(success, "First Put failed");
    }
    
    // Fallback triggers reentrant call
    fallback() external payable {
        if (address(bank).balance >= 1 ether) {
            (bool success, ) = bank.call{value: 0}(abi.encodeWithSignature("Put(uint256)", block.timestamp));
            require(success, "Reentrant Put failed");
        }
    }
    
    receive() external payable {}
}