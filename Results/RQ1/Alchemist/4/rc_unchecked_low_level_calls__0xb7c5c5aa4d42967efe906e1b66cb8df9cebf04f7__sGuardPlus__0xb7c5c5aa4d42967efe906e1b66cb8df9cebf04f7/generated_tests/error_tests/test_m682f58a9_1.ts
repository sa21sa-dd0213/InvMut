import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant test - require removal", function () {
  it("should revert when withdraw is called from a contract that rejects ether, but the mutant zeroes balance anyway", async function () {
    // Deploy the main contract
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious receiver contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the malicious contract with some ether so it can call withdraw
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner deposits ether into keepMyEther using the malicious contract as msg.sender
    // We'll simulate by having the malicious contract call deposit (via fallback)
    await malicious.connect(owner).deposit(await instance.getAddress(), { value: ethers.parseEther("1.0") });

    // Check balance is recorded
    const maliciousAddr = await malicious.getAddress();
    let balance = await instance.balances(maliciousAddr);
    expect(balance).to.equal(ethers.parseEther("1.0"));

    // Now call withdraw from the malicious contract - it will reject the ether transfer
    // In the original contract this reverts, in the mutant it sets balance to 0
    await malicious.connect(owner).attemptWithdraw(await instance.getAddress());

    // After the call, in the mutant the balance should be 0 despite the failed transfer
    balance = await instance.balances(maliciousAddr);
    expect(balance).to.equal(0);

    // Verify the contract didn't actually receive the ether (the malicious contract kept it)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});

// Helper contract to act as malicious receiver
// Note: In a real test this would be a separate Solidity file, but for completeness:
// contract MaliciousReceiver {
//   function deposit(address target) external payable {
//     (bool sent, ) = target.call{value: msg.value}("");
//     require(sent);
//   }
//   function attemptWithdraw(address target) external {
//     (bool sent, ) = target.call(abi.encodeWithSignature("withdraw()"));
//     // We don't check sent - we want to see if balance is zeroed
//   }
//   receive() external payable {
//     revert("I reject ether");
//   }
// }