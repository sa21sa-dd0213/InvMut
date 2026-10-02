import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test", function () {
  it("should revert when withdrawal fails (mutant removed revert)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a receiver contract that rejects incoming ETH
    const ReceiverFactory = await ethers.getContractFactory("RejectingReceiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    // Fund the Reentrance contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Add balance to receiver's address in Reentrance
    await instance.connect(attacker).addToBalance({ value: ethers.parseEther("0.5") });
    
    // Add more balance from owner to receiver's address
    await instance.connect(owner).addToBalance({ value: ethers.parseEther("1.5") });
    
    // Now call withdrawBalance from receiver contract
    await expect(
      receiver.withdrawFrom(await instance.getAddress())
    ).to.be.reverted;

    // Verify that receiver's balance in Reentrance is preserved (original behavior)
    const balanceAfter = await instance.getBalance(await receiver.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("2.0"));
  });
});

// Helper contract that rejects ETH
contract RejectingReceiver {
    function addBalance(address instanceAddress) external payable {
        (bool success, ) = instanceAddress.call{value: msg.value}(
            abi.encodeWithSignature("addToBalance()")
        );
        require(success, "Add balance failed");
    }
    
    function withdrawFrom(address instanceAddress) external {
        (bool success, ) = instanceAddress.call(
            abi.encodeWithSignature("withdrawBalance()")
        );
        require(success, "Withdraw failed");
    }
    
    // Reject incoming ETH
    receive() external payable {
        revert("ETH rejected");
    }
}