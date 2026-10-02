import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ReentrancyDAO mutant test - missing require(callResult)", function () {
    it("should revert when recipient reverts and preserve state", async function () {
        // Deploy the ReentrancyDAO contract (no constructor arguments)
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const dao = await Factory.deploy();
        await dao.waitForDeployment();

        // Deploy a malicious receiver contract that reverts on receive
        const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
        const malicious = await MaliciousFactory.deploy();
        await malicious.waitForDeployment();

        // Fund the DAO with some Ether
        const [owner, attacker] = await ethers.getSigners();
        await owner.sendTransaction({
            to: await dao.getAddress(),
            value: ethers.parseEther("10")
        });

        // Attacker deposits to get credit
        await dao.connect(attacker).deposit({ value: ethers.parseEther("5") });

        // Check initial credit and balance
        const initialCredit = await dao.credit(attacker.address);
        const initialBalance = await ethers.provider.getBalance(await dao.getAddress());
        expect(initialCredit).to.equal(ethers.parseEther("5"));
        expect(initialBalance).to.equal(ethers.parseEther("10"));

        // Attacker calls withdrawAll which should revert due to require(callResult)
        // In the mutant, this would succeed and corrupt state
        await expect(
            dao.connect(attacker).withdrawAll()
        ).to.be.reverted;

        // Verify state is unchanged (original behavior)
        const finalCredit = await dao.credit(attacker.address);
        const finalBalance = await ethers.provider.getBalance(await dao.getAddress());
        expect(finalCredit).to.equal(ethers.parseEther("5"));
        expect(finalBalance).to.equal(ethers.parseEther("10"));
    });
});